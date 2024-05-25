


// const getValidPomFile = (name, version) =>
//   `<?xml version="1.0" encoding="UTF-8"?>
//   <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
//       <packaging>atlassian-plugin</packaging>
//       <properties>
//           <host.version>${version}</host.version>
//       </properties>
//       <build>
//           <plugins>
//               <plugin>
//                   <groupId>com.atlassian.maven.plugins</groupId>
//                   <artifactId>${name}-maven-plugin</artifactId>
//                   <version>0.0.0</version>
//                   <configuration>
//                     <productVersion>\${host.version}</productVersion>
//                     <productDataVersion>\${host.version}</productDataVersion>
//                   </configuration>
//               </plugin>
//           </plugins>
//       </build>
//   </project>`;

export const getValidPomFileFor = (name, version, profile) =>
  `<?xml version="1.0" encoding="UTF-8"?>
  <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
      <packaging>atlassian-plugin</packaging>
      <properties>
          <host.version>${version}</host.version>
      </properties>
      ${ profile ? `
        <profiles>
          <profile>
            <id>${profile}</id>
            <build>
              <plugins>
                  <plugin>
                      <groupId>com.atlassian.maven.plugins</groupId>
                      <artifactId>${name}-maven-plugin</artifactId>
                      <version>0.0.0</version>
                      <configuration>
                        <productVersion>\${host.version}</productVersion>
                        <productDataVersion>\${host.version}</productDataVersion>
                      </configuration>
                  </plugin>
              </plugins>
            </build>
          </profile>
        </profiles>
      ` : `
      <build>
          <plugins>
              <plugin>
                  <groupId>com.atlassian.maven.plugins</groupId>
                  <artifactId>${name}-maven-plugin</artifactId>
                  <version>0.0.0</version>
                  <configuration>
                    <productVersion>\${host.version}</productVersion>
                    <productDataVersion>\${host.version}</productDataVersion>
                  </configuration>
              </plugin>
          </plugins>
      </build>
      `}
  </project>`;


export const getValidLegacyPomFileFor = (name, version) =>
`<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
    <packaging>atlassian-plugin</packaging>
    <properties>
        <host.version>${version}</host.version>
    </properties>
    <build>
        <plugins>
            <plugin>
                <groupId>com.atlassian.maven.plugins</groupId>
                <artifactId>${name}-maven-plugin</artifactId>
                <version>0.0.0</version>
                <configuration>
                    <products>
                        <product>
                            <id>${name}</id>
                            <instanceId>${name}</instanceId>
                            <version>\${host.version}</version>
                            <dataVersion>\${host.version}</dataVersion>
                        </product>
                    </products>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>`;

export const pomFileWithoutAtlassianPackaging = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
</project>`;

export const pomFileWithoutProduct = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
</project>`;

export const pomFileWithInvalidProduct = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>compass-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const pomFileWithProductButWithoutVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const pomFileWithProductButWithInvalidVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <productVersion>1000.000.000</productVersion>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const pomFileWithProductAndVersionWithIncorrectPropertyReplacement = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <productVersion>\${invalidProperty}</productVersion>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const pomFileWithMultipleProducts = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
        </configuration>
      </plugin>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>confluence-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const pomFileWithoutActiveProfile = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>not-active</id>        
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithActiveProfileWithoutProducts = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active</id>        
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>compass-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithActiveProfileWithoutVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active</id>        
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;


export const pomFileWithActiveProfileWithoutSupportedVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active</id>        
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
              <productVersion>1000.000.000</productVersion>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithActiveProfileAndVersionWithIncorrectPropertyReplacement = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active</id>        
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
              <productVersion>\${invalidProperty}</productVersion>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithActiveProfileWithMultipleProducts = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>confluence-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithMultipleActiveProfilesWithoutProducts = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active1</id> 
    </profile>
    <profile>
      <id>active2</id> 
    </profile>
  </profiles>
</project>`;

export const pomFileWithMultipleActiveProfilesWithoutValidProducts = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active1</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>compass-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
    <profile>
      <id>active2</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>rovo-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithMultipleActiveProfilesWithASingleProductWithoutVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active1</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
    <profile>
      <id>active2</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>compass-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithMultipleActiveProfilesWithASingleProductWithoutValidVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active1</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
              <productVersion>1000.000.000</productVersion>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
    <profile>
      <id>active2</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>compass-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithMultipleActiveProfilesAndVersionWithIncorrectPropertyReplacement = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active1</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
              <productVersion>\${invalidProperty}</productVersion>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
    <profile>
      <id>active2</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>compass-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;

export const pomFileWithMultipleActiveProfilesWithMultipleProducts = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <profiles>
    <profile>
      <id>active1</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>jira-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
    <profile>
      <id>active2</id> 
      <build>
        <plugins>
          <plugin>
            <groupId>com.atlassian.maven.plugins</groupId>
            <artifactId>confluence-maven-plugin</artifactId>
            <version>0.0.0</version>
            <configuration>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`;




export const legacyPomFileWithInvalidProduct = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>compass-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <products>
            <product>
              <id>Application</id>
              <version>1.0.0</version>
            </product>
          </products>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const legacyPomFileWithProductButWithoutVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <products>
            <product>
              <id>Application</id>
            </product>
          </products>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const legacyPomFileWithProductButWithInvalidVersion = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <products>
            <product>
              <id>Application</id>
              <version>1000.000.000</version>
            </product>
          </products>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const legacyPomFileWithProductAndVersionWithIncorrectPropertyReplacement = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <properties>
    <jira.version>1.0.0</jira.version>
  </properties>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <products>
            <product>
              <id>Application</id>
              <version>\${invalidProperty}</version>
            </product>
          </products>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

export const legacyPomFileWithMultipleProducts = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <packaging>atlassian-plugin</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>jira-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <products>
            <product>
              <id>Application</id>
              <version>1.0.0</version>
            </product>
          </products>
        </configuration>
      </plugin>
      <plugin>
        <groupId>com.atlassian.maven.plugins</groupId>
        <artifactId>confluence-maven-plugin</artifactId>
        <version>0.0.0</version>
        <configuration>
          <products>
            <product>
              <id>Application</id>
              <version>1.0.0</version>
            </product>
          </products>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;
